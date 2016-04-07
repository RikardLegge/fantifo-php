<?php

class InvalidMessageException extends Exception {};

class SyncMessage {
	const SYNC_SIGNAL = 1;
	const START_SIGNAL = 2;
	const STOP_SIGNAL = 3;

	public function __construct($data) {
		$jsonData = json_decode($data);
		$this->type = $jsonData->type;
		if($this->type !== self::SYNC_SIGNAL)
			throw new InvalidMessageException("Unknown message type: {$this->type}");

		$this->timeStamp = $jsonData->timeStamp;
	}

	public function getResponse() {
		return json_encode([
			'type'=> self::SYNC_SIGNAL,
			'timeStamp'=> $this->timeStamp,
			'serverTimeStamp'=> $this->getServerTimeStamp()
		]);
	}

	private function getServerTimeStamp() {
		return intval(microtime(true) * 1000);
	}
}
