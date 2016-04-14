<?php

class InvalidMessageException extends Exception {};

class Message {
	const SYNC_SIGNAL = 1;
	const START_SIGNAL = 2;
	const STOP_SIGNAL = 3;
	const REQUEST_SYNC_SIGNAL = 11;
	const REQUEST_START_SIGNAL = 12;
	const REQUEST_STOP_SIGNAL = 13;

	static function create($data) {
		$jsonData = json_decode($data);
		switch($jsonData->type) {
		case Message::REQUEST_SYNC_SIGNAL:
			return new RequestSyncMessage($jsonData);
		case Message::REQUEST_START_SIGNAL:
			return new RequestStartMessage($jsonData);
		default:
			throw new InvalidMessageException(
				"Unknown message type: {$jsonData->type}"
			);
		}
	}
}
