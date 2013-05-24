	$('#theme-options ul.backgrounds li').click(function(){
		$bgSrc = $(this).css('background-image');
		if ($(this).attr('class') == 'bgnone')
			$bgSrc = "none";

		$('body').css('background-image',$bgSrc);
		$.cookie('background', $bgSrc);
		$.cookie('backgroundclass', $(this).attr('class').replace(' active',''));
		$(this).addClass('active').siblings().removeClass('active');
	});



	$('#theme-options .title').click(function(){
		return;
		if ($('#theme-options').css('right') == "-138px")
		{
			$right = "0px";
			$.cookie('displayoptions', "0");
		} else {
			$right = "-138px";
			$.cookie('displayoptions', "1");
		}

		$('#theme-options').animate({
			right: $right
		},{
			duration: 500,
			easing: "easeInOutExpo"
		});


	});

	$(function(){
		$('#theme-options').fadeIn();
		$bgSrc = $.cookie('background');
		$('body').css('background-image',$bgSrc);

		if ($.cookie('displayoptions') == "1")
		{
			$('#theme-options').css('right','-138px');
		} else if ($.cookie('displayoptions') == "0") {
			$('#theme-options').css('right','0');
		} else {
			$('#theme-options').delay(800).animate({
				right: "-138px"
			},{
				duration: 500,
				easing: "easeInOutExpo"
			});

			$.cookie('displayoptions', "1");
		}

		$('#theme-options ul.backgrounds').find('li.' + $.cookie('backgroundclass')).addClass('active');

	});