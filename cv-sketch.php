<?php
/**
 * Plugin Name: CV Sketch App
 * Description: Makes the CV Sketch pages work: JSON validation, CV templates, PDF and Word export, saved profiles (browser + account) and email login.
 * Version:     2.0.0
 * Author:      CV Sketch
 * License:     GPL-2.0-or-later
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CVS_VERSION', '2.0.0' );
define( 'CVS_URL', plugin_dir_url( __FILE__ ) );
define( 'CVS_META_KEY', 'cvs_profiles' );
define( 'CVS_MAX_PROFILES', 100 );
define( 'CVS_MAX_PROFILE_BYTES', 300000 );

/**
 * Front-end assets.
 */
add_action( 'wp_enqueue_scripts', 'cvs_enqueue_assets' );
function cvs_enqueue_assets() {
	if ( is_admin() || isset( $_GET['elementor-preview'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		return;
	}

	wp_enqueue_style( 'cv-sketch-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap', array(), null );
	wp_enqueue_style( 'cv-sketch-app', CVS_URL . 'assets/cvs-app.css', array( 'cv-sketch-fonts' ), CVS_VERSION );
	wp_enqueue_script( 'cv-sketch-templates', CVS_URL . 'assets/cvs-templates.js', array(), CVS_VERSION, true );
	wp_enqueue_script( 'cv-sketch-app', CVS_URL . 'assets/cvs-app.js', array( 'cv-sketch-templates' ), CVS_VERSION, true );

	$user = wp_get_current_user();
	$slug = is_singular() ? get_post_field( 'post_name', get_queried_object_id() ) : '';

	wp_localize_script(
		'cv-sketch-app',
		'CVS_CONFIG',
		array(
			'restUrl'   => esc_url_raw( rest_url( 'cv-sketch/v1/' ) ),
			'nonce'     => wp_create_nonce( 'wp_rest' ),
			'loggedIn'  => is_user_logged_in(),
			'userName'  => $user->exists() ? $user->display_name : '',
			'logoutUrl' => wp_logout_url( home_url( '/' ) ),
			'lostUrl'   => wp_lostpassword_url(),
			'slug'      => $slug,
			'isFront'   => is_front_page(),
			'pages'     => array(
				'home'      => home_url( '/' ),
				'auth'      => cvs_page_url( 'sign-up-log-in' ),
				'workspace' => cvs_page_url( 'workspace' ),
				'templates' => cvs_page_url( 'templates' ),
				'preview'   => cvs_page_url( 'preview-download' ),
				'profiles'  => cvs_page_url( 'my-profiles' ),
			),
		)
	);
}

function cvs_page_url( $path ) {
	$page = get_page_by_path( $path );
	return $page ? get_permalink( $page ) : home_url( '/' . $path . '/' );
}

/**
 * My Profiles is our own page, not an Elementor layout.
 * Swapping the template keeps the theme out of the way: no header, no footer,
 * no block styles — just the custom app shell in templates/page-profiles.php.
 */
add_filter( 'template_include', 'cvs_takeover_profiles_page', 99 );
function cvs_takeover_profiles_page( $template ) {
	if ( is_admin() || ! is_singular() ) {
		return $template;
	}

	$slug = get_post_field( 'post_name', get_queried_object_id() );
	if ( 'my-profiles' !== $slug ) {
		return $template;
	}

	$custom = plugin_dir_path( __FILE__ ) . 'templates/page-profiles.php';
	if ( ! file_exists( $custom ) ) {
		return $template;
	}

	// The page is per-visitor (names, sync state), so keep it out of any page cache.
	if ( ! headers_sent() ) {
		nocache_headers();
		header( 'X-CV-Sketch-Page: custom-profiles' );
	}

	return $custom;
}

/**
 * REST API.
 */
add_action( 'rest_api_init', 'cvs_register_routes' );
function cvs_register_routes() {
	register_rest_route(
		'cv-sketch/v1',
		'/login',
		array(
			'methods'             => 'POST',
			'callback'            => 'cvs_rest_login',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'cv-sketch/v1',
		'/register',
		array(
			'methods'             => 'POST',
			'callback'            => 'cvs_rest_register',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'cv-sketch/v1',
		'/sync',
		array(
			'methods'             => 'POST',
			'callback'            => 'cvs_rest_sync',
			'permission_callback' => 'is_user_logged_in',
		)
	);
	register_rest_route(
		'cv-sketch/v1',
		'/health',
		array(
			'methods'             => 'GET',
			'callback'            => 'cvs_rest_health',
			'permission_callback' => '__return_true',
		)
	);
}

/**
 * Deployment health probe: proves the object cache really is talking to Redis
 * and that the custom profile page is in place.
 */
function cvs_rest_health() {
	$redis = array(
		'host'      => defined( 'WP_REDIS_HOST' ) ? WP_REDIS_HOST : null,
		'port'      => defined( 'WP_REDIS_PORT' ) ? WP_REDIS_PORT : null,
		'reachable' => false,
		'error'     => null,
	);

	// Ask the drop-in itself: it owns the connection (Predis or PhpRedis).
	$backend = isset( $GLOBALS['wp_object_cache'] ) ? $GLOBALS['wp_object_cache'] : null;
	if ( is_object( $backend ) && method_exists( $backend, 'info' ) ) {
		try {
			$info = json_decode( wp_json_encode( $backend->info() ), true );
			$info = is_array( $info ) ? $info : array();
			$meta = isset( $info['meta'] ) ? $info['meta'] : array();

			$redis['client']    = isset( $meta['Client'] ) ? $meta['Client'] : null;
			$redis['version']   = isset( $meta['Redis Version'] ) ? $meta['Redis Version'] : null;
			$redis['reachable'] = method_exists( $backend, 'redis_status' )
				? (bool) $backend->redis_status()
				: ! empty( $redis['version'] );
			$redis['errors']    = isset( $info['errors'] ) ? $info['errors'] : null;
		} catch ( Throwable $e ) {
			$redis['error'] = $e->getMessage();
		}
	} else {
		$redis['error'] = 'No external object cache backend is loaded (drop-in missing or disabled).';
	}

	// Prove the object cache is actually serving this request.
	$probe_key = 'cvs_health_probe';
	wp_cache_set( $probe_key, 'hit', 'cvs_health', 30 );
	$probe_hit = 'hit' === wp_cache_get( $probe_key, 'cvs_health' );

	// Cross-request counter: only a persistent (Redis-backed) cache increments it.
	$ping_key = 'cvs_health_ping';
	$ping     = (int) wp_cache_get( $ping_key, 'cvs_health' );
	wp_cache_set( $ping_key, $ping + 1, 'cvs_health', 300 );

	return rest_ensure_response(
		array(
			'ok'               => true,
			'plugin'           => CVS_VERSION,
			'php'              => PHP_VERSION,
			'objectCache'      => wp_using_ext_object_cache(),
			'dropIn'           => file_exists( WP_CONTENT_DIR . '/object-cache.php' ),
			'cacheProbe'       => $probe_hit,
			'persistentHandles'=> $ping,
			'profilePage'      => file_exists( plugin_dir_path( __FILE__ ) . 'templates/page-profiles.php' ),
			'redis'            => $redis,
			'time'             => gmdate( 'c' ),
		)
	);
}

/**
 * Simple per-IP rate limit. Returns true when the action is allowed.
 */
function cvs_rate_limit( $action, $max, $window ) {
	$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
	$key = 'cvs_rl_' . md5( $action . '|' . $ip );
	$hit = (int) get_transient( $key );
	if ( $hit >= $max ) {
		return false;
	}
	set_transient( $key, $hit + 1, $window );
	return true;
}

function cvs_error( $code, $message, $status = 400 ) {
	return new WP_Error( $code, $message, array( 'status' => $status ) );
}

function cvs_rest_login( WP_REST_Request $request ) {
	if ( ! cvs_rate_limit( 'login', 10, 15 * MINUTE_IN_SECONDS ) ) {
		return cvs_error( 'cvs_rate_limited', 'Too many attempts. Take a short break and try again in 15 minutes.', 429 );
	}

	$login    = trim( (string) $request->get_param( 'email' ) );
	$password = (string) $request->get_param( 'password' );

	if ( '' === $login || '' === $password ) {
		return cvs_error( 'cvs_missing', 'Fill in your email and password.' );
	}

	$user = wp_signon(
		array(
			'user_login'    => $login,
			'user_password' => $password,
			'remember'      => true,
		),
		is_ssl()
	);

	if ( is_wp_error( $user ) ) {
		return cvs_error( 'cvs_bad_login', 'That email and password don\'t match. Check for typos and try again.', 401 );
	}

	return rest_ensure_response(
		array(
			'ok'   => true,
			'name' => $user->display_name,
		)
	);
}

function cvs_rest_register( WP_REST_Request $request ) {
	// Honeypot field: real people never fill it in.
	if ( '' !== trim( (string) $request->get_param( 'website' ) ) ) {
		return cvs_error( 'cvs_spam', 'Something went wrong. Please try again.' );
	}
	if ( ! cvs_rate_limit( 'register', 5, HOUR_IN_SECONDS ) ) {
		return cvs_error( 'cvs_rate_limited', 'Too many new accounts from this connection. Try again in an hour.', 429 );
	}

	$email    = sanitize_email( (string) $request->get_param( 'email' ) );
	$password = (string) $request->get_param( 'password' );

	if ( ! is_email( $email ) ) {
		return cvs_error( 'cvs_bad_email', 'That email address doesn\'t look right.' );
	}
	if ( strlen( $password ) < 8 ) {
		return cvs_error( 'cvs_short_password', 'Password needs at least 8 characters.' );
	}
	if ( email_exists( $email ) ) {
		return cvs_error( 'cvs_email_taken', 'There\'s already an account with that email. Switch to "Log in" instead.' );
	}

	$base     = sanitize_user( current( explode( '@', $email ) ), true );
	$base     = '' === $base ? 'sketcher' : $base;
	$username = $base;
	$i        = 1;
	while ( username_exists( $username ) ) {
		$username = $base . $i;
		$i++;
	}

	$user_id = wp_insert_user(
		array(
			'user_login'   => $username,
			'user_email'   => $email,
			'user_pass'    => $password,
			'display_name' => $base,
			'role'         => 'subscriber',
		)
	);

	if ( is_wp_error( $user_id ) ) {
		return cvs_error( 'cvs_register_failed', 'We couldn\'t create the account. Please try again.' );
	}

	wp_set_current_user( $user_id );
	wp_set_auth_cookie( $user_id, true, is_ssl() );

	return rest_ensure_response(
		array(
			'ok'   => true,
			'name' => $base,
		)
	);
}

/**
 * Merge the browser's profiles with the ones stored on the account.
 * The newest `updated` timestamp wins; deletions are kept as tombstones
 * so a CV deleted on one device doesn't come back from another.
 */
function cvs_rest_sync( WP_REST_Request $request ) {
	$user_id  = get_current_user_id();
	$incoming = $request->get_param( 'profiles' );
	$incoming = is_array( $incoming ) ? $incoming : array();

	$stored = get_user_meta( $user_id, CVS_META_KEY, true );
	$stored = is_array( $stored ) ? $stored : array();

	foreach ( $incoming as $profile ) {
		$clean = cvs_clean_profile( $profile );
		if ( ! $clean ) {
			continue;
		}
		$id = $clean['id'];
		if ( ! isset( $stored[ $id ] ) || (int) $stored[ $id ]['updated'] < $clean['updated'] ) {
			$stored[ $id ] = $clean;
		}
	}

	// Keep the newest profiles if the account goes over the limit.
	if ( count( $stored ) > CVS_MAX_PROFILES ) {
		uasort(
			$stored,
			function ( $a, $b ) {
				return (int) $b['updated'] - (int) $a['updated'];
			}
		);
		$stored = array_slice( $stored, 0, CVS_MAX_PROFILES, true );
	}

	update_user_meta( $user_id, CVS_META_KEY, $stored );

	return rest_ensure_response(
		array(
			'ok'       => true,
			'profiles' => array_values( $stored ),
		)
	);
}

function cvs_clean_profile( $profile ) {
	if ( ! is_array( $profile ) || empty( $profile['id'] ) || ! is_string( $profile['id'] ) ) {
		return null;
	}
	if ( ! preg_match( '/^[a-z0-9-]{6,64}$/', $profile['id'] ) ) {
		return null;
	}

	$updated = isset( $profile['updated'] ) ? (int) $profile['updated'] : 0;

	if ( ! empty( $profile['deleted'] ) ) {
		return array(
			'id'      => $profile['id'],
			'updated' => $updated,
			'deleted' => true,
		);
	}

	$clean = array(
		'id'       => $profile['id'],
		'updated'  => $updated,
		'created'  => isset( $profile['created'] ) ? (int) $profile['created'] : $updated,
		'doc'      => isset( $profile['doc'] ) && is_array( $profile['doc'] ) ? $profile['doc'] : array(),
		'raw'      => isset( $profile['raw'] ) && is_string( $profile['raw'] ) ? $profile['raw'] : '',
		'settings' => isset( $profile['settings'] ) && is_array( $profile['settings'] ) ? $profile['settings'] : array(),
	);

	if ( strlen( wp_json_encode( $clean ) ) > CVS_MAX_PROFILE_BYTES ) {
		return null;
	}

	return $clean;
}
