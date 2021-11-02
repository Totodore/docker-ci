package main

func InterfaceToStringSlice(params []interface{}) []string {
	var paramSlice []string
	for _, param := range params {
		paramSlice = append(paramSlice, param.(string))
	}
	return paramSlice
}
