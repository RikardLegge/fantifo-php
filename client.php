<script>
	var host = "ws://0.0.0.0:12345";
	var id = location.search.substring(1) || 0;

	try {

		socket = new WebSocket(host);

		console.log('WebSocket - status ' + socket.readyState);

		socket.onopen = function(msg) {
			console.log("Welcome - status "+this.readyState);
			socket.send(id);
		};

		socket.onmessage = function(msg){ 
			console.log("Received: " + msg.data); 


			document.getElementById('color').style.background = "#" + msg.data;


		}; 

		socket.onclose = function(msg){ 
			console.log("Disconnected - status "+this.readyState); 
		}; 

	}

	catch(ex) {
		console.log(ex);
	}

</script>

<style type="text/css">
	
body, html {
	height: 100%;
	margin: 0;
}

.color {
	width: 100%;
	height: 100%;
	display: block;
	background: red;
}

</style>

<div id="color" class="color">
	
</div>