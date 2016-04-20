<?php

spl_autoload_extensions(".php");
spl_autoload_register();

require_once("../vendor/autoload.php");

function main() {
	$loop = \React\EventLoop\Factory::create();

	// Create a logger which writes everything to the STDOUT
	$logger = new \Zend\Log\Logger();
	$writer = new Zend\Log\Writer\Stream("php://output");
	$logger->addWriter($writer);

	$server = new SyncServer("tcp://0.0.0.0:12345", $loop, $logger, 'IAMADMIN');
	$server->bind();

	// Start the event loop
	$loop->run();
}

main();

?>
