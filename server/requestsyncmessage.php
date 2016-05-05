<?php

class RequestSyncMessage {
	public function __construct($json) {
		$this->timeStamp = $json->timeStamp;
	}

	public function handle($server, $client) {
		echo "Sync message received\n";
		$client->sendString(json_encode([
			'type'=> Message::SYNC_SIGNAL,
			'timeStamp'=> $this->timeStamp,
			'serverTimeStamp'=> $this->getServerTimeStamp()
		]));
	}

	private function getServerTimeStamp() {
		return intval(microtime(true) * 1000);
	}
}
