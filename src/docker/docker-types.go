package docker

type ContainerEvent string
type ImageEvent string
type StreamEvent int

const (
	Attach_container        ContainerEvent = "attach"
	Commit_container        ContainerEvent = "commit"
	Copy_container          ContainerEvent = "copy"
	Create_container        ContainerEvent = "create"
	Destroy_container       ContainerEvent = "destroy"
	Detach_container        ContainerEvent = "detach"
	Die_container           ContainerEvent = "die"
	Exec_create_container   ContainerEvent = "exec_create"
	Exec_detach_container   ContainerEvent = "exec_detach"
	Exec_die_container      ContainerEvent = "exec_die"
	Exec_start_container    ContainerEvent = "exec_start"
	Export_container        ContainerEvent = "export"
	Health_status_container ContainerEvent = "health_status"
	Kill_container          ContainerEvent = "kill"
	Oom_container           ContainerEvent = "oom"
	Pause_container         ContainerEvent = "pause"
	Rename_container        ContainerEvent = "rename"
	Resize_container        ContainerEvent = "resize"
	Restart_container       ContainerEvent = "restart"
	Start_container         ContainerEvent = "start"
	Stop_container          ContainerEvent = "stop"
	Top_container           ContainerEvent = "top"
	Unpause_container       ContainerEvent = "unpause"
	Update_container        ContainerEvent = "update"
)

// const (
// 	delete_image ImageEvent = "delete"
// 	import_image ImageEvent = "import"
// 	load_image   ImageEvent = "load"
// 	pull_image   ImageEvent = "pull"
// 	push_image   ImageEvent = "push"
// 	save_image   ImageEvent = "save"
// 	tag_image    ImageEvent = "tag"
// 	untag_image  ImageEvent = "untag"
// )

type ContainerInfo struct {
	Names []string
	Id    string
}
type DockerAuth struct {
	Username      string `json:"username,omitempty"`
	Password      string `json:"password,omitempty"`
	Serveraddress string `json:"serveraddress,omitempty"`
}

const (
	Start        StreamEvent = iota
	Pull         StreamEvent = iota
	PullMessage  StreamEvent = iota
	PullEnd      StreamEvent = iota
	Build        StreamEvent = iota
	BuildMessage StreamEvent = iota
	BuildEnd     StreamEvent = iota
	Stop         StreamEvent = iota
	Recreate     StreamEvent = iota
	Restart      StreamEvent = iota
	Error        StreamEvent = iota
	RemoveImage  StreamEvent = iota
	Remove       StreamEvent = iota
	End          StreamEvent = iota
)
