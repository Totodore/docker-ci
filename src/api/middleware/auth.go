package middleware

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/dgrijalva/jwt-go"
)

type JWTClaims struct {
	username string `json:"username"`
	jwt.StandardClaims
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		_, err := getPayload(auth)
		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte("Unauthorized"))
		} else {
			next.ServeHTTP(w, r)
		}
	})
}

func getPayload(auth string) (*JWTClaims, error) {
	auth = strings.TrimSpace(auth)
	if auth == "" {
		return nil, errors.New("authorization header is empty")
	} else {
		token := strings.SplitAfter(auth, " ")[1]
		if token != "" {
			payload, err := jwt.ParseWithClaims(token, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
				return []byte(os.Getenv("JWT_SECRET")), nil
			})
			if err != nil {
				return nil, err
			}
			if claims, ok := payload.Claims.(*JWTClaims); ok && payload.Valid {
				return claims, nil
			} else {
				return nil, err
			}
		} else {
			return nil, errors.New("authorization header is empty")
		}
	}
}
