<?php

class RequestSyncMessage {
	public function __construct($json) {
		$this->timeStamp = $json->timeStamp;
	}

	public function handle($server) {
		echo "Sync message received\n";
		$server->broadcast(json_encode([
			'type'=> Message::SYNC_SIGNAL,
			'timeStamp'=> $this->timeStamp,
			'serverTimeStamp'=> $this->getServerTimeStamp()
		]));
	}

	private function getServerTimeStamp() {
		return intval(microtime(true) * 1000);
	}
}
