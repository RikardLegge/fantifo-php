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

$loop->addPeriodicTimer(10, function() use($server, $logger, $imagedata, &$framecounter){

	$id = 0;

    foreach($server->getConnections() as $client) {

    	$prev_index = ($id % 4) * 4 + (($framecounter - 1) % 4);
    	$index = ($id % 4) * 4 + ($framecounter % 4);

    	$prev_color = $imagedata[$prev_index];
    	$color = $imagedata[$index];

    	if($prev_color != $color){
			$client->sendString($imagedata[$index]);
    	}
    	//$logger->notice("Index: $index");
    	//$logger->notice("Image: $imagedata[$index]");
    	//$logger->notice("Broadcasting time to all clients: $index");

    	//$logger->notice("Frame: $framecounter");


		$id++;
    }

    $framecounter++;
});

$server->on("connect", function($client) {
	// Identify client here to figure out color
	echo "Client connected\n";
});

// Bind the server
$server->bind();

// Start the event loop
$loop->run();


?>
