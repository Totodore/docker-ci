package main

import (
	"log"
	"net/http"
	"os"

	"github.com/julienschmidt/httprouter"
)

func startServer(onRequest func(name string) int) {
	port := os.Getenv("PORT")
	router := httprouter.New()
	router.GET("/hooks/:name", func(w http.ResponseWriter, req *http.Request, params httprouter.Params) {
		requestHandler(w, params, onRequest)
	})
	log.Println("Listening for requests at http://localhost:" + port + "/hooks/")
	log.Fatal(http.ListenAndServe(":"+port, router))
}
func requestHandler(w http.ResponseWriter, params httprouter.Params, onRequest func(name string) int) {
	name := params.ByName("name")
	if len(name) == 0 {
		w.WriteHeader(http.StatusBadRequest)
	} else {
		status := onRequest(name)
		w.WriteHeader(status)
	}
}
