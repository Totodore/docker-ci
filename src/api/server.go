package api

import (
	"log"
	"net/http"
	"os"
	"strings"

	"dockerci/src/docker"
	"dockerci/src/utils"

	"github.com/dgrijalva/jwt-go"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Server struct {
	router     *mux.Router
	port       string
	containers *[]docker.ContainerInfo
}
type RequestHandler func(name string, c *websocket.Conn) (int, string)

func New(containers *[]docker.ContainerInfo, onRequest RequestHandler) *Server {
	port := os.Getenv("PORT")
	router := mux.NewRouter()
	server := &Server{router, port, containers}
	router.Use(mux.CORSMethodMiddleware(router))
	router.HandleFunc("/hooks/{name}", func(res http.ResponseWriter, req *http.Request) {
		Handle(res, req, onRequest)
	}).Methods("GET")
	apiGroup := router.PathPrefix("/api").Subrouter()
	apiGroup.HandleFunc("/", server.fetchHooks).Methods("GET")
	apiGroup.HandleFunc("/auth", server.auth).Methods("POST")

	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./dist")))
	return server
}

func (s *Server) Serve() {
	log.Printf("Listening for requests at http://localhost:%s/hooks/", s.port)
	if err := http.ListenAndServe(":"+s.port, s.router); err != nil {
		log.Fatal(err)
	}
}
func (s *Server) fetchHooks(res http.ResponseWriter, req *http.Request) {
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
	res.Header().Set("Content-Type", "application/json")
	res.WriteHeader(200)
	res.Write(utils.ToJSON(filteredContainers))
}
func (s *Server) auth(res http.ResponseWriter, req *http.Request) {
	var data AuthRequest
	if err := utils.FromJSON(req.Body, &data); err != nil {
		res.WriteHeader(400)
		res.Write(utils.ToJSON(map[string]string{"error": err.Error()}))
		return
	}
	if data.Password != os.Getenv("PASSWORD") {
		res.WriteHeader(401)
		res.Write(utils.ToJSON(map[string]string{"error": "Invalid password"}))
		return
	}
	token := jwt.New(jwt.SigningMethodHS256)
	auth, err := token.SignedString([]byte(os.Getenv("PRIVATE_KEY")))
	if err != nil {
		log.Println(err)
		res.WriteHeader(500)
		res.Write(utils.ToJSON(map[string]string{"error": "Internal server error"}))
		return
	}
	res.WriteHeader(200)
	res.Write(utils.ToJSON(map[string]string{"token": auth}))
}
