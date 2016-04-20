<?php

class RequestStartMessage {
	public function __construct($json) {
		$this->adminToken = $json->adminToken;
		$this->when = $json->when;
	}

	public function handle($server) {
		echo "Request start message received from admin\n";
		$server->adminStart($this->adminToken, $this->when);
	}
}
