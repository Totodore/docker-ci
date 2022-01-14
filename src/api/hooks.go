package api

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{}

//Handler for webhooks
//Trigger onRequest when a webhook is received
//If it is a websocket request a stream is transmitted to request func
func handleHook(w http.ResponseWriter, req *http.Request, onRequest RequestHandler) {
	if req.URL.Scheme != "wss" && req.URL.Scheme != "ws" {
		name := mux.Vars(req)["name"]
		if len(name) == 0 {
			w.WriteHeader(http.StatusBadRequest)
		} else {
			status, msg := onRequest(name, nil)
			w.WriteHeader(status)
			w.Write([]byte(msg))
		}
	} else {
		c, err := upgrader.Upgrade(w, req, nil)
		if err != nil {
			log.Println(err)
			return
		}

		defer c.Close()
		name := mux.Vars(req)["name"]
		if len(name) == 0 {
			c.WriteControl(websocket.CloseMessage, []byte("400 Bad Request"), time.Now().Add(time.Second))
		} else {
			onRequest(name, c)
		}
	}
}
