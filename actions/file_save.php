<?php

// Check if filename was provided
$filename = isset($_POST["filename"]) 
	? preg_replace('/\.psxml$/', '', $_POST["filename"]) 
	: "cm_save_out.psxml" ;


// Set headers to text file
header("Content-type: text/xml");
header('Content-Transfer-Encoding: binary');
header('Content-Disposition: attachment; filename="'.$filename.'"');
header("Pragma: no-cache");
header("Expires: 0");

print $_POST["file"];

?>