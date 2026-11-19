<?php
/**
 * My Profiles — custom-coded page. Served by the plugin through template_include,
 * so it is not an Elementor layout and does not inherit theme styling.
 *
 * @package CVSketch
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$cvs_user     = wp_get_current_user();
$cvs_logged   = is_user_logged_in();
$cvs_name     = $cvs_user->exists() ? $cvs_user->display_name : '';
$cvs_initials = '';

if ( '' !== $cvs_name ) {
	$cvs_parts = preg_split( '/\s+/', trim( $cvs_name ) );
	foreach ( array_slice( $cvs_parts, 0, 2 ) as $cvs_part ) {
		$cvs_initials .= strtoupper( substr( $cvs_part, 0, 1 ) );
	}
}

$cvs_pages = array(
	'home'      => home_url( '/' ),
	'workspace' => cvs_page_url( 'workspace' ),
	'templates' => cvs_page_url( 'templates' ),
	'preview'   => cvs_page_url( 'preview-download' ),
	'profiles'  => cvs_page_url( 'my-profiles' ),
	'auth'      => cvs_page_url( 'sign-up-log-in' ),
);

$cvs_config = array(
	'restUrl'   => esc_url_raw( rest_url( 'cv-sketch/v1/' ) ),
	'nonce'     => wp_create_nonce( 'wp_rest' ),
	'loggedIn'  => $cvs_logged,
	'userName'  => $cvs_name,
	'logoutUrl' => wp_logout_url( home_url( '/' ) ),
	'pages'     => array(
		'workspace' => $cvs_pages['workspace'],
		'templates' => $cvs_pages['templates'],
		'preview'   => $cvs_pages['preview'],
		'profiles'  => $cvs_pages['profiles'],
		'auth'      => $cvs_pages['auth'],
	),
);
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex, follow">
	<title>My Profiles · CV Sketch</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Roboto+Slab:wght@500;700;900&family=JetBrains+Mono:wght@400;600&display=swap">
	<link rel="stylesheet" href="<?php echo esc_url( CVS_URL . 'assets/cvs-app.css?ver=' . CVS_VERSION ); ?>">
	<link rel="stylesheet" href="<?php echo esc_url( CVS_URL . 'assets/cvs-profiles.css?ver=' . CVS_VERSION ); ?>">
	<?php // A tiny icon keeps browser tabs on-brand without a theme dependency. ?>
	<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23fdfbf7'/%3E%3Cpath d='M8 22c6-1 11-6 12-13' stroke='%232d5da1' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E">
</head>
<body class="cvsx-body">

<header class="cvsx-nav">
	<a class="cvsx-logo" href="<?php echo esc_url( $cvs_pages['home'] ); ?>">
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M4 20c5-.6 9.5-4.6 11.5-11"></path>
			<path d="M13 4.5 19 10"></path>
			<path d="M17.5 3.5a2.3 2.3 0 0 1 3.2 3.2L19 10l-4 1 1-4z"></path>
		</svg>
		CVSketch
	</a>
	<nav class="cvsx-navlinks" aria-label="Main">
		<a href="<?php echo esc_url( $cvs_pages['home'] ); ?>">How it works</a>
		<a href="<?php echo esc_url( $cvs_pages['templates'] ); ?>">Templates</a>
		<a href="<?php echo esc_url( $cvs_pages['workspace'] ); ?>">Workspace</a>
		<a class="is-active" href="<?php echo esc_url( $cvs_pages['profiles'] ); ?>" aria-current="page">My Profiles</a>
	</nav>
	<div class="cvsx-navactions">
		<?php if ( $cvs_logged ) : ?>
			<a class="cvsx-who" href="<?php echo esc_url( $cvs_config['logoutUrl'] ); ?>" title="Click to log out">
				<span class="cvsx-avatar"><?php echo esc_html( '' !== $cvs_initials ? $cvs_initials : 'CV' ); ?></span>
				<?php echo esc_html( $cvs_name ); ?>
			</a>
			<a class="cvsx-btn is-primary" href="<?php echo esc_url( $cvs_pages['workspace'] ); ?>">New CV</a>
		<?php else : ?>
			<a class="cvsx-who" href="<?php echo esc_url( $cvs_pages['auth'] ); ?>">Log in</a>
			<a class="cvsx-btn is-primary" href="<?php echo esc_url( $cvs_pages['auth'] ); ?>">Start free</a>
		<?php endif; ?>
	</div>
</header>

<main class="cvsx-main">
	<span class="cvsx-kicker">🗂 Desk blotter &middot; local sketches</span>

	<div class="cvsx-hero">
		<h1>My Saved Profiles
			<svg class="cvsx-wave" viewBox="0 0 300 14" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true">
				<path d="M3 9c18-7 36 5 54-1s36-8 54 1 36 6 54-2 36 4 54 0 36-6 78 1"></path>
			</svg>
		</h1>
		<p class="cvsx-lead" id="cvsx-lead">Every version you have shaped, in one place.</p>
	</div>

	<div class="cvsx-stats">
		<div class="cvsx-note">
			<b id="cvsx-stat-total">0 CVs</b>
			<span>saved in this browser</span>
		</div>
		<div class="cvsx-note" id="cvsx-stat-sync">
			<b><?php echo $cvs_logged ? 'On' : 'Off'; ?></b>
			<span><?php echo $cvs_logged ? 'account sync' : 'log in to sync'; ?></span>
		</div>
		<div class="cvsx-note">
			<b id="cvsx-stat-last">nothing yet</b>
			<span>last change</span>
		</div>
	</div>

	<div class="cvsx-toolbar">
		<div class="cvsx-search">
			<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
				<circle cx="11" cy="11" r="7"></circle>
				<path d="m20 20-3.5-3.5"></path>
			</svg>
			<input type="search" id="cvsx-q" placeholder="Search by name, role, company or template" autocomplete="off">
		</div>
		<select class="cvsx-select" id="cvsx-sort" aria-label="Sort profiles">
			<option value="newest">Newest first</option>
			<option value="oldest">Oldest first</option>
			<option value="az">Title A–Z</option>
			<option value="template">By template</option>
		</select>
		<div class="cvsx-chips" role="group" aria-label="Filter by status">
			<button type="button" class="cvsx-chipbtn is-on" data-status="all">All</button>
			<button type="button" class="cvsx-chipbtn" data-status="draft">Drafts</button>
			<button type="button" class="cvsx-chipbtn" data-status="submitted">Submitted</button>
			<button type="button" class="cvsx-chipbtn" data-status="deadline">Has deadline</button>
		</div>
		<div class="cvsx-actions">
			<span class="cvsx-count" id="cvsx-count"></span>
			<button type="button" class="cvsx-btn is-small is-ghost" id="cvsx-import">Import</button>
			<button type="button" class="cvsx-btn is-small is-ghost" id="cvsx-backup">Backup</button>
			<button type="button" class="cvsx-btn is-small is-ghost" id="cvsx-clear">Clear browser</button>
		</div>
	</div>

	<div class="cvsx-grid" id="cvsx-grid"></div>

	<div class="cvsx-empty" id="cvsx-empty" hidden>
		<div class="cvsx-plus" aria-hidden="true">+</div>
		<h2>Craft your first CV</h2>
		<p>Paste a job advert into the workspace, copy the prompt into any AI chat, and save the result here.</p>
		<a class="cvsx-btn is-primary" href="<?php echo esc_url( $cvs_pages['workspace'] ); ?>?new=1">Open a blank sheet</a>
	</div>

	<div class="cvsx-drop" id="cvsx-drop">
		Drop a CV JSON file or a CV Sketch backup here, or use <strong>Import</strong> above.
	</div>
</main>

<footer class="cvsx-footer">
	<span>Saved in this browser<?php echo $cvs_logged ? ' and synced to your account' : ''; ?> &middot; nothing is sent to a third party.</span>
	<span>CV Sketch by <a href="<?php echo esc_url( home_url( '/' ) ); ?>">The Internet Blueprint</a></span>
</footer>

<div class="cvsx-toast" id="cvsx-toast" role="status" aria-live="polite"></div>

<script>window.CVSX_CONFIG = <?php echo wp_json_encode( $cvs_config ); ?>;</script>
<script src="<?php echo esc_url( CVS_URL . 'assets/cvs-templates.js?ver=' . CVS_VERSION ); ?>"></script>
<script src="<?php echo esc_url( CVS_URL . 'assets/cvs-profiles.js?ver=' . CVS_VERSION ); ?>"></script>
</body>
</html>
