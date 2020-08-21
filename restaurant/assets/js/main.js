$(function(){
	//cache window bimobject 
	var $window = $(window);
	//parralax background effect
	$('section[data-type="background"]').each(function(){
		var $bgobj = $(this); // assigning the object
		$(window).scroll(function(){
			//scroll window at var speed
			// the y position is negative val bc scrolling up
			var yPos = -($window.scrollTop() / $bgobj.data('speed'));
			//put together background position
			var coords = '50% ' + yPos + 'px';
			//move the background
			$bgobj.css({ backgroundPosition: coords});
		});
	});
});