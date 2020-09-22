<?php
//error_reporting(0);   // Don't report errors
//ignore_user_abort(1); // Allow running script in the background

/*
 * This is an example of how to handle TrackUI logs.
 * We are going to create .csv (plus .xml files) inside the logs dir.
 * Remember to assign write permissions to that dir.
 *
 * We will use PHP to store the log files, but any server-side technology is possible;
 * you just need to write your custom data handling stuff.
 */

define('LOGDIR', "logs");
define('LOGEXT', ".csv");
define('INFSEP', "|||"); // Must match INFO_SEPARATOR in trackui.js

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: X-Requested-With');
header('Access-Control-Max-Age: 86400'); // Cache preflight request

// Exit early so that the page isn't fully loaded for OPTIONS requests
if (strtolower($_SERVER['REQUEST_METHOD']) == 'options') exit;

// If raw post data, this could be a beacon
$headers = getallheaders();
if (strpos($headers['Content-Type'], 'text/') !== FALSE) {
  $buffer = file_get_contents('php://input');
  $_POST = json_decode($buffer, TRUE);
  foreach ($_POST as $key => $value) {
    if (is_string($value)) {
      $_POST[$key] = rawurldecode($value);
    }
  }
} elseif (isset($HTTP_RAW_POST_DATA)) {
  $data = explode('&', $HTTP_RAW_POST_DATA);
  foreach ($data as $val) {
    if (!empty($val)) {
      list($key, $value) = explode('=', $val);
        $_POST[$key] = rawurldecode($value);
    }
  }
}

if (get_magic_quotes_gpc()) {
  function stripslashes_deep($value) {
    $value = is_array($value) ? array_map('stripslashes_deep', $value) : stripslashes($value);
    return $value;
  }
  $_GET  = stripslashes_deep($_GET);
  $_POST = stripslashes_deep($_POST);
}

// Some browsers might not send empty vars
if (!isset($_POST['action'])) exit;

$info_data = isset($_POST['info']) ? $_POST['info'] : '';
// Convert JS array to newline-delimited entries
$info_data = str_replace(INFSEP, PHP_EOL, $info_data) .PHP_EOL;

// Ensure that our dir exists
if (!is_dir(LOGDIR) && !mkdir(LOGDIR)) exit;

if ($_POST['action'] == "init") {

  $fid = (int)date("YmdHis");
  // Avoid duplicated file IDs
  while (is_file(LOGDIR."/".$fid.LOGEXT)) $fid++;

  // Save data for the first time.
  // The column separator must ARGS_SEPARATOR in trackui.js
  $header = "cursor timestamp xpos ypos event xpath attrs extras" .PHP_EOL;
  file_put_contents(LOGDIR."/".$fid.LOGEXT, $header.$info_data);

  // Save metadata
  $xml  = '<?xml version="1.0" encoding="UTF-8"?>' .PHP_EOL;
  $xml .= '<data>' .PHP_EOL;
  $xml .= ' <ip>'.$_SERVER['REMOTE_ADDR'].'</ip>' .PHP_EOL;
  $xml .= ' <date>'.date("r").'</date>' .PHP_EOL;
  $xml .= ' <url>'.htmlentities($_POST['url']).'</url>' .PHP_EOL;
  $xml .= ' <ua>'.$_SERVER['HTTP_USER_AGENT'].'</ua>' .PHP_EOL;
  $xml .= ' <screen>'.$_POST['screenw'] .'x'. $_POST['screenh'].'</screen>' .PHP_EOL;
  $xml .= ' <window>'.$_POST['winw'] .'x'. $_POST['winh'].'</window>' .PHP_EOL;
  $xml .= ' <document>'.$_POST['docw'] .'x'. $_POST['doch'].'</document>' .PHP_EOL;
  $xml .= ' <task>'.$_POST['task'].'</task>' .PHP_EOL;
  $xml .= '</data>' .PHP_EOL;
  file_put_contents(LOGDIR."/".$fid.".xml", $xml);

  // Notify recording script
  echo $fid;

} else if ($_POST['action'] == "append") {

  // Don't write blank lines
  if (trim($info_data)) {
    file_put_contents(LOGDIR."/".$_POST['uid'].LOGEXT, $info_data, FILE_APPEND);
  }

}
?>
