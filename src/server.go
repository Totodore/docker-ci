package main

import (
	"log"
	"net/http"
	"os"
)

func startServer() {
	handler := func(w http.ResponseWriter, req *http.Request) {
		req.URL.Query().Get("name")
		w.WriteHeader(http.StatusBadRequest)
	}
	port := os.Getenv("PORT")
	http.HandleFunc("/", handler)
	log.Println("Listing for requests at http://localhost:" + port + "/")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
