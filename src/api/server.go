package api

import (
	"log"
	"os"
	"strings"

	"dockerci/src/api/middleware"
	"dockerci/src/docker"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
)

type Server struct {
	router     *gin.Engine
	port       string
	containers *[]docker.ContainerInfo
}

func New(containers *[]docker.ContainerInfo, onRequest func(name string) (int, string)) *Server {
	port := os.Getenv("PORT")
	router := gin.Default()
	server := &Server{router, port, containers}
	router.Use(middleware.CORSMiddleware())
	apiGroup := router.Group("/api")
	apiGroup.GET("/", server.fetchHooks)
	apiGroup.POST("/auth", server.auth)
	router.GET("/hooks/:name", func(c *gin.Context) {
		Handle(c, onRequest)
	})
	router.Use(static.Serve("/", static.LocalFile("./dist", true)))
	log.Printf("Listening for requests at http://localhost:%s/hooks/", port)
	return server
}

func (s *Server) Serve() {
	s.router.Run(":" + s.port)
}
func (s *Server) fetchHooks(c *gin.Context) {
	var filteredContainers []docker.ContainerInfo
	for _, container := range *s.containers {
		hasName := true
		for _, name := range container.Names {
			if strings.TrimSpace(name) == "" {
				hasName = false
				break
			}
		}
		if hasName && strings.TrimSpace(container.Id) != "" {
			filteredContainers = append(filteredContainers, container)
		}
	}
	c.JSON(200, filteredContainers)
}
func (s *Server) auth(c *gin.Context) {
	var data AuthRequest
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if data.Password != os.Getenv("PASSWORD") {
		c.JSON(401, gin.H{"error": "Invalid password"})
		return
	}
	token := jwt.New(jwt.SigningMethodHS256)
	auth, err := token.SignedString([]byte(os.Getenv("PRIVATE_KEY")))
	if err != nil {
		log.Println(err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(200, gin.H{"token": auth})
}
