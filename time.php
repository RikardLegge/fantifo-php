<?php
echo "Test\n";

require_once("vendor/autoload.php");
use Devristo\Phpws\Server\WebSocketServer;


use Devristo\Phpws\Messaging\WebSocketMessageInterface;
use Devristo\Phpws\Protocol\WebSocketTransportInterface;
use Devristo\Phpws\Server\UriHandler\WebSocketUriHandler;

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
$client_map = array();


// $server->on("message", function(\Devristo\Phpws\Protocol\WebSocketTransportInterface $transport, \Devristo\Phpws\Protocol $handshake){
//     $handshake->getResponse()->getHeaders()->addHeaderLine("X-WebSocket-Server", "phpws");
// });

$loop->addPeriodicTimer(10, function() use($server, $logger, $imagedata, &$framecounter, $clientid, $client_map){

    foreach($server->getConnections() as $client) {

    	//var_dump($client);

    	$id = $client_map[$client["_id"]];
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


class ChatHandler extends WebSocketUriHandler {
    /**
     * Notify everyone when a user has joined the chat
     *
     * @param WebSocketTransportInterface $user
     */
    public function onConnect(WebSocketTransportInterface $user){
        
    }
    /**
     * Broadcast messages sent by a user to everyone in the room
     *
     * @param WebSocketTransportInterface $user
     * @param WebSocketMessageInterface $msg
     */
    public function onMessage(WebSocketTransportInterface $user, WebSocketMessageInterface $msg) {
    	$client_id = $msg->getData();
    	$id = $user->getId();

    	$this->logger->notice("New client connected: $id, $client_id");
    	$client_map[$id] = $client_id;
    }
}

// Add route to listen for messages
$router = new \Devristo\Phpws\Server\UriHandler\ClientRouter($server, $logger);
$router->addRoute('#^(.*)$#i', new ChatHandler($logger));

// Bind the server
$server->bind();

// Start the event loop
$loop->run();


?>