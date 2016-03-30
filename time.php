<?php
echo "Test\n";

require_once("vendor/autoload.php");
use Devristo\Phpws\Server\WebSocketServer;

$loop = \React\EventLoop\Factory::create();

// Create a logger which writes everything to the STDOUT
$logger = new \Zend\Log\Logger();
$writer = new Zend\Log\Writer\Stream("php://output");
$logger->addWriter($writer);

// Create a WebSocket server using SSL
$server = new WebSocketServer("tcp://0.0.0.0:12345", $loop, $logger);

$framecounter = 0;
$imagedata = array(
	'000000',
	'D8D8D8',
	'D8D8D8',
	'D8D8D8',

	'D8D8D8',
	'000000',
	'D8D8D8',
	'D8D8D8',

	'D8D8D8',
	'D8D8D8',
	'000000',
	'D8D8D8',

	'D8D8D8',
	'D8D8D8',
	'D8D8D8',
	'000000',
);

$clients = [];

$loop->addPeriodicTimer(1, function() use($server, $logger, $imagedata, &$clients, &$framecounter){

	foreach($clients as $id => $connections) {
    	$prev_index = ($id % 4) * 4 + (($framecounter - 1) % 4);
    	$index = ($id % 4) * 4 + ($framecounter % 4);

    	$prev_color = $imagedata[$prev_index];
    	$color = $imagedata[$index];

    	if($prev_color != $color){
			foreach($connections as $connection) {
				$connection->sendString($imagedata[$index]);
			}
    	}
    }

    $framecounter++;
});

$server->on("connect", function($client) {
	echo "Client connected\n";
});

// Right now we only receive one message from the client
$server->on("message", function($client, $message) use(&$clients) {
	$id = intval($message->getData());
	if(isset($clients[$id]))
		array_push($clients[$id], $client);
	else
		$clients[$id] = array($client);
	echo "Client identified itself as $id\n";
});

$server->on("close", function($client) use(&$clients) {
	// This is a bit convoluted but works
	foreach($clients as $id => $connections) {
		$key = array_search($connection, $connections);
		if($key != FALSE) {
			unset($connections[$key]);
			echo "Removed client $key\n";
		}
	}

	// TODO Kill empty id's
});

// Bind the server
$server->bind();

// Start the event loop
$loop->run();

?>
