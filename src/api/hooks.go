package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

//Handler for webhooks
//Trigger onRequest when a webhook is received
func Handle(c *gin.Context, onRequest func(name string) (int, string)) {
	name := c.Params.ByName("name")
	if len(name) == 0 {
		c.Status(http.StatusBadRequest)
	} else {
		status, msg := onRequest(name)
		c.Status(status)
		c.String(status, msg)
	}
}
