<?php

// Init response object
$res = array();

// Check that ../files is writable
if (!is_writable("../files"))
{
	$res['err'] = array(
		'title' => "File directory not writable",
		'text' => 'The directory on the server that stores files is not writable by PHP. Change permissions of the files directory and try again.'
	);
	echo json_encode( $res );
	exit();
}

// Store the file array in local var
$file = $_FILES["xml_file"];

// Log the upload attempt
error_log("Uploaded File to Corner Marker: \n" . print_r($file,true));

// Check for an upload error
if ($file["error"])
{
	switch( $file["error"] )
	{
		case 1:
			$res['err'] = array(
				'title' => 'File too large',
				'text' => 'The uploaded file exceeds the upload_max_filesize directive in php.ini.'
			);
			break;
		
		case 2:
			$res['err'] = array(
				'title' => 'File too large',
				'text' => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.'
			);
			break;
		
		case 3:
			$res['err'] = array(
				'title' => 'Upload interrupted',
				'text' => 'The uploaded file was only partially uploaded.'
			);
			break;
			
		case 4:
			$res['err'] = array(
				'title' => 'File not found',
				'text' => 'No file was uploaded.'
			);
			break;
			
		case 6:
			$res['err'] = array(
				'title' => 'Server error',
				'text' => 'Missing a temporary folder.'
			);
			break;
			
		case 7:
			$res['err'] = array(
				'title' => "Can't write to disk",
				'text' => 'Failed to write file to disk.'
			);
			break;
			
		case 8:
			$res['err'] = array(
				'title' => 'PHP Extension error',
				'text' => 'A PHP extension stopped the file upload. This shouldn\'t be happening... Check the php error log!'
			);
			break;
		
	}
	// Add error code to text element
	$res['err']['text'] .= " ({$file['error']})";
	
	// return response with error and exit
	echo json_encode( $res );
	exit();
}

// Check that the name has only one extension: .psxml
if (!preg_match('/\.psxml$/', $file["name"]))
{
	$res['err'] = array(
		'title' => 'Wrong file extension',
		'text' => 'This app can only open <code>.psxml</code> files'
	);
	echo json_encode( $res );
	exit();
}

// Check that the type is either application/octet-stream or text/xml
if ( $file['type'] != 'application/octet-stream' && $file['type'] != 'text/xml' )
{
	$res['err'] = array(
		'title' => 'Wrong MIME type',
		'text' => 'Type of file should be either application/octet-stream or text/xml'
	);
	echo json_encode( $res );
	exit();
}

// Move uploaded file to the "files" directory
if ( move_uploaded_file( $file["tmp_name"], "../files/{$file['name']}" ) )
{
	$res['location'] = "index.php?file=".urlencode($file['name']);
}
else
{
	$res['err'] = array(
		'title' => "<code>move_uploaded_file</code> failed",
		'text' => 'Check the php error log on the server for more information.',
	);
	echo json_encode( $res );
	exit();
}

// Return response (JSON)
echo json_encode( $res );

?>