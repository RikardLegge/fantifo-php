<?php

use Devristo\Phpws\Server\WebSocketServer;

class SyncServer extends WebSocketServer {
	public function __construct($url, $loop, $logger) {
		parent::__construct($url, $loop, $logger);

		$this->on("message", [$this, 'onMessage']);
	}

	public function onMessage($client, $message) {
		try {
			$syncMessage = new SyncMessage($message->getData());
			echo "Sync message received\n";
			$this->broadcast($syncMessage->getResponse());
		} catch(InvalidMessageException $e) {
			echo "Failed to process message: " . $e->getMessage() . "\n";
		}
	}

	public function broadcast($message) {
		foreach($this->getConnections() as $client) {
			$client->sendString($message);
		}
	}
}
