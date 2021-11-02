package main

type ContainerEvent string
type ImageEvent string

const (
	attach_container        ContainerEvent = "attach"
	commit_container        ContainerEvent = "commit"
	copy_container          ContainerEvent = "copy"
	create_container        ContainerEvent = "create"
	destroy_container       ContainerEvent = "destroy"
	detach_container        ContainerEvent = "detach"
	die_container           ContainerEvent = "die"
	exec_create_container   ContainerEvent = "exec_create"
	exec_detach_container   ContainerEvent = "exec_detach"
	exec_die_container      ContainerEvent = "exec_die"
	exec_start_container    ContainerEvent = "exec_start"
	export_container        ContainerEvent = "export"
	health_status_container ContainerEvent = "health_status"
	kill_container          ContainerEvent = "kill"
	oom_container           ContainerEvent = "oom"
	pause_container         ContainerEvent = "pause"
	rename_container        ContainerEvent = "rename"
	resize_container        ContainerEvent = "resize"
	restart_container       ContainerEvent = "restart"
	start_container         ContainerEvent = "start"
	stop_container          ContainerEvent = "stop"
	top_container           ContainerEvent = "top"
	unpause_container       ContainerEvent = "unpause"
	update_container        ContainerEvent = "update"
)
const (
	delete_image ImageEvent = "delete"
	import_image ImageEvent = "import"
	load_image   ImageEvent = "load"
	pull_image   ImageEvent = "pull"
	push_image   ImageEvent = "push"
	save_image   ImageEvent = "save"
	tag_image    ImageEvent = "tag"
	untag_image  ImageEvent = "untag"
)

type DockerAuth struct {
	Username      string `json:"username,omitempty"`
	Password      string `json:"password,omitempty"`
	Serveraddress string `json:"serveraddress,omitempty"`
}
