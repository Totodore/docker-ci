package utils

import (
	"encoding/json"
	"io"
	"math/rand"
)

func InterfaceToStringSlice(params []interface{}) []string {
	var paramSlice []string
	for _, param := range params {
		var paramStr string
		switch paramAssert := param.(type) {
		case error:
			paramStr = paramAssert.Error()
		default:
			paramStr = paramAssert.(string)
		}
		paramSlice = append(paramSlice, paramStr)
	}
	return paramSlice
}

var letterRunes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

func RandStringRunes(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letterRunes[rand.Intn(len(letterRunes))]
	}
	return string(b)
}

func ToJSON(data interface{}) []byte {
	bytes, err := json.Marshal(data)
	if err != nil {
		return []byte("{}")
	}
	return bytes
}
func FromJSON(body io.ReadCloser, obj interface{}) error {
	return json.NewDecoder(body).Decode(&obj)
}
