<?php

// Set the filename
$filename = ( isset($_GET['file']) && file_exists("files/{$_GET['file']}") ) ? $_GET['file'] : "172-000.psxml" ;

// Read the file
$string = file_get_contents("files/$filename");

?>
<!DOCTYPE html>
<html lang="en">
    <head>
		<meta charset="utf-8">
		<meta name="description" content="This web app can be used to quickly add text markers to corners of patterns in PatternSmith psxml projects.">
		<title>Corner Marker</title>
		<!-- reset styles -->
		<link rel="stylesheet" href="css/reset.css" type="text/css" media="screen">
		<!-- include ui theme -->
		<link rel="stylesheet" href="css/jquery-ui-1.9.1.custom.min.css" type="text/css" media="screen">
		<!-- pnotify styles -->
		<link rel="stylesheet" href="css/jquery.pnotify.default.css" type="text/css" media="all">
		
		
		
		<!-- app styles -->
		<link rel="stylesheet" href="css/styles.css" type="text/css" media="screen">
		
		<!-- <script type="text/javascript" data-main="js/main" src="js/vendor/require.js"></script> -->
    </head>
    <body>
		<div id="cm-loading-icon" class="hide"></div>
		<div id="cm-menu-bar">
			<h1>Corner Marker</h1>
			<div class="cm-menu-item" data-menu="file">
				<a href="#" class="cm-menu-item-header">file</a>
				<ul class="cm-menu-dropdown">
					<li><a href="#" data-action="file_open">Open...</a></li>
					<li><a href="#" data-action="file_save">Save</a></li>
				</ul>
			</div>
			<div class="cm-menu-item" data-menu="settings">
				<a href="#" class="cm-menu-item-header">settings</a>
			</div>
		</div>
		<ul class="top-toolbox">
			<li>
				<button title="cursor: select and move objects (v)" class="cm-tool cursor-tool" data-tool="cursor">cursor</button>
			</li>
			<li>
				<button title="hand: move the visible area (space)" class="cm-tool hand-tool" data-tool="hand">hand</button>
			</li>
			<li>
				<button title="zoom: hold shift to zoom out (m)" class="cm-tool zoom-tool" data-tool="zoom">zoom</button>
			</li>
			<li>
				<button title="mark: mark a corner with up to three symbols" class="cm-tool mark-tool" data-tool="mark">mark</button>
			</li>
		</ul>
		<form id="cm-settings-frm">
			
			<div id="cm-setting-sections">
				<h3>General</h3>
				<fieldset>
					
				</fieldset>
				<h3>Canvas</h3>
				<fieldset>
					
				</fieldset>
				<h3>Tools</h3>
				<fieldset>
					
				</fieldset>
				<h3>Plot Types</h3>
				<fieldset>
					
				</fieldset>
			</div>
			
		</form>
		
		<div id="canvas-disabler"></div>
		<!-- templates -->
		<script type="text/html" id="mark_dialog">
		
			<form class="mark-dialog" title="Add Marks to this corner">
				
				<fieldset>
					<legend>Basic Marking Options</legend>
					
					<div class="mark-wrapper">
						<label for="entry_mark">Entry Mark:</label>
						<input type="text" name="entry_mark" id="entry_mark" value="ENT"/>
					</div><div class="mark-wrapper">
						<label for="corner_mark">Corner Mark:</label>
						<input type="text" value="COR" name="corner_mark" id="corner_mark" />
					</div><div class="mark-wrapper">
						<label for="exit_mark">Exit Mark:</label>
						<input type="text" name="exit_mark" id="exit_mark" value="EXT" />
					</div><div class="input-wrapper">
						<label for="draw_semi">Draw Semi-Circle:</label>
						<input type="checkbox" name="draw_semi" id="draw_semi" checked="checked" />
					</div>
					
				</fieldset>
				
				<fieldset>
					<legend>Additional Options</legend>
					
					<div class="additional-options">
						<div class="distance_from_edge-wrapper">
							<label for="distance_from_edge">Minimum Distance from Edge:</label>
							<input type="text" name="distance_from_edge" id="distance_from_edge" value="{{distance_from_edge}}" />
						</div>

						<div class="text_height-wrapper">
							<label for="text_height">Text Height:</label>
							<input type="text" name="text_height" id="text_height" value="{{text_height}}" />
						</div>

						<div class="rename_pattern">
							<label for="rename_pattern">Rename Pattern:</label>
							<input type="checkbox" name="rename_pattern" id="rename_pattern" />
						</div>
					</div>
					
				</fieldset>
				
			</form>
		
		</script>
		<script type="text/html" id="save_form">

			<form method="post" action="/actions/file_save.php">
				<label for="filename">file name:</label>
				<input type="text" value="{{filename}}" />
				<input name="file" type="hidden" value="{{{file}}}" />
				<input name="encode_test" value="&quot;" />
			</form>

		</script>
		<script type="text/html" id="open_form">
		
			<form method="post" action="/actions/file_open.php" enctype="multipart/form-data" class="hide">
				<input type="file" name="xml_file" class="xml_file">
			</form>
			
		</script>
		
		<!-- the actual psxml document -->
		<script type="text/xml" id="project-data"><?php echo $string;?></script>
		
		<!-- icanhaz -->
		<script src="js/vendor/icanhaz.js"></script>
		
		<!-- jquery -->
		<script src="js/vendor/jquery-1.8.2.js"></script>
		
		<!-- jquery ui -->
		<script src="js/vendor/jquery-ui-1.9.1.custom.min.js"></script>
		<!-- <script src="js/jqueryui_settings.js"></script> -->
		
		<!-- jquery plugins -->
		<script src="js/vendor/jquery.form.js"></script>
		
		<!-- pnotify -->
		<script src="js/vendor/jquery.pnotify.min.js"></script>
		
		<!-- main app file -->
		<script src="js/corner-marker.js"></script>
		
	</body>
</html>