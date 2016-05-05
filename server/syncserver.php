<?php

use Devristo\Phpws\Server\WebSocketServer;

class SyncServer extends WebSocketServer {
	private $adminToken;
	private $running = false;
	private $startTime;

	public function __construct($url, $loop, $logger, $adminToken) {
		parent::__construct($url, $loop, $logger);

		$this->adminToken = $adminToken;
		$this->on("message", [$this, 'onMessage']);
	}

	public function onMessage($client, $rawMessage) {
		try {
			$message = Message::create($rawMessage->getData());
			$message->handle($this, $client);
		} catch(InvalidMessageException $e) {
			echo "Failed to process message: " . $e->getMessage() . "\n";
		}
	}

	public function broadcast($message) {
		foreach($this->getConnections() as $client) {
			$client->sendString($message);
		}
	}

	public function adminStart($adminToken, $when) {
		$this->running = true;
		$this->startTime = $when;
		$this->adminBroadcast($adminToken, json_encode([
			'type' => Message::START_SIGNAL,
			'when' => $this->startTime
		]));
	}

	public function adminBroadcast($adminToken, $message) {
		if($adminToken == $this->adminToken)
			$this->broadcast($message);
		else
			echo "AdminToken is invalid\n";
	}
}
