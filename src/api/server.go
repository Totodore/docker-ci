package api

import (
	"log"
	"net/http"
	"os"

	"dockerci/src/docker"

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
		handleHook(res, req, onRequest)
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
