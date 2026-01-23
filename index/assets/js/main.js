/*
	Spatial by TEMPLATED
	templated.co @templatedco
	Released for free under the Creative Commons Attribution 3.0 license (templated.co/license)
*/

(function($) {

	skel.breakpoints({
		xlarge:	'(max-width: 1680px)',
		large:	'(max-width: 1280px)',
		medium:	'(max-width: 980px)',
		small:	'(max-width: 736px)',
		xsmall:	'(max-width: 480px)'
	});

	$(function() {

		var	$window = $(window),
			$body = $('body');

		// Disable animations/transitions until the page has loaded.
			$body.addClass('is-loading');

			$window.on('load', function() {
				window.setTimeout(function() {
					$body.removeClass('is-loading');
				}, 100);
			});

		// Fix: Placeholder polyfill.
			$('form').placeholder();

		// Prioritize "important" elements on medium.
			skel.on('+medium -medium', function() {
				$.prioritize(
					'.important\\28 medium\\29',
					skel.breakpoint('medium').active
				);
			});

		// Off-Canvas Navigation.

			// Off-Canvas Navigation.

// Navigation Panel Toggle.
// $('<a href="#navPanel" class="navPanelToggle"></a>')
//   .appendTo($body);

// Navigation Panel.
var $navPanel = $(
  '<div id="navPanel">' +
    '<nav>' +
      $('#nav').html() +
    '</nav>' +
    '<a href="#navPanel" class="close"></a>' +
  '</div>'
);

$navPanel
  .appendTo($body)
  .panel({
    delay: 500,
    hideOnClick: true,
    hideOnSwipe: true,
    resetScroll: true,
    resetForms: true,
    side: 'right'
  });

  // Hide/show hamburger when panel opens/closes
$body.on('click', '#hamburger', function() {
    // Hide hamburger when clicked
    $('#hamburger').hide();
});

// Show hamburger when panel closes
$body.on('click', '#navPanel .close', function() {
    setTimeout(function() {
        $('#hamburger').show();
    }, 500); // Match the panel delay
});

// Also show hamburger when clicking outside the panel
$body.on('click touchend', function(event) {
    if (!$(event.target).closest('#navPanel, #hamburger').length) {
        setTimeout(function() {
            $('#hamburger').show();
        }, 500);
    }
});

// Fix: Remove transitions on WP<10
if (skel.vars.os == 'wp' && skel.vars.osVersion < 10)
  $navPanel.css('transition', 'none');



	});

})(jQuery);
