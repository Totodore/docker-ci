package main

import (
	"log"
	"net/http"
	"os"
)

func startServer(onRequest func(name string)) {
	port := os.Getenv("PORT")
	handler := func(w http.ResponseWriter, req *http.Request) {
		requestHandler(w, req, onRequest)
	}
	http.HandleFunc("/", handler)
	log.Println("Listing for requests at http://localhost:" + port + "/")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
func requestHandler(w http.ResponseWriter, req *http.Request, onRequest func(name string)) {
	name := req.URL.Query().Get("name")
	if len(name) == 0 {
		w.WriteHeader(http.StatusBadRequest)
	} else {
		onRequest(name)
	}
}
