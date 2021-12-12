package api

import (
	"net/http"

	"github.com/gorilla/mux"
)

//Handler for webhooks
//Trigger onRequest when a webhook is received
func Handle(w http.ResponseWriter, req *http.Request, onRequest func(name string) (int, string)) {
	name := mux.Vars(req)["name"]
	if len(name) == 0 {
		w.WriteHeader(http.StatusBadRequest)
	} else {
		status, msg := onRequest(name)
		w.WriteHeader(status)
		w.Write([]byte(msg))
	}
}
