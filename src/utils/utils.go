package utils

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
