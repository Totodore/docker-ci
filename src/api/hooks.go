package api

import (
	"io"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

//Handler for webhooks
//Trigger onRequest when a webhook is received
func Handle(w http.ResponseWriter, params httprouter.Params, onRequest func(name string) (int, string)) {
	name := params.ByName("name")
	if len(name) == 0 {
		w.WriteHeader(http.StatusBadRequest)
	} else {
		status, msg := onRequest(name)
		w.WriteHeader(status)
		io.WriteString(w, msg)
	}
}
