package main

import (
	"io"
	"log"
	"net/http"
	"os"

	"github.com/julienschmidt/httprouter"
)

func startServer(onRequest func(name string) (int, string)) {
	port := os.Getenv("PORT")
	router := httprouter.New()
	router.GET("/hooks/:name", func(w http.ResponseWriter, req *http.Request, params httprouter.Params) {
		requestHandler(w, params, onRequest)
	})
	log.Println("Listening for requests at http://localhost:" + port + "/hooks/")
	log.Fatal(http.ListenAndServe(":"+port, router))
}

//Handler for webhooks
//Trigger onRequest when a webhook is received
func requestHandler(w http.ResponseWriter, params httprouter.Params, onRequest func(name string) (int, string)) {
	name := params.ByName("name")
	if len(name) == 0 {
		w.WriteHeader(http.StatusBadRequest)
	} else {
		status, msg := onRequest(name)
		w.WriteHeader(status)
		io.WriteString(w, msg)
	}
}
