package api

import (
	"dockerci/src/docker"
	"dockerci/src/utils"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/dgrijalva/jwt-go"
)

type AuthRequest struct {
	Password string `json:"password"`
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
