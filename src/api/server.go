package api

import (
	"log"
	"net/http"
	"os"

	"github.com/julienschmidt/httprouter"
)

func StartServer(onRequest func(name string) (int, string)) {
	port := os.Getenv("PORT")
	router := httprouter.New()
	router.GET("/hooks/:name", func(w http.ResponseWriter, req *http.Request, params httprouter.Params) {
		Handle(w, params, onRequest)
	})
	log.Printf("Listening for requests at http://localhost:%s/hooks/", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
