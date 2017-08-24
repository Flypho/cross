$('.form').find('input, textarea').on('keyup blur focus', function (e) {
  
  var $this = $(this),
      label = $this.prev('label');

	  if (e.type === 'keyup') {
			if ($this.val() === '') {
          label.removeClass('active highlight');
        } else {
          label.addClass('active highlight');
        }
    } else if (e.type === 'blur') {
    	if( $this.val() === '' ) {
    		label.removeClass('active highlight'); 
			} else {
		    label.removeClass('highlight');   
			}   
    } else if (e.type === 'focus') {
      
      if( $this.val() === '' ) {
    		label.removeClass('highlight'); 
			} 
      else if( $this.val() !== '' ) {
		    label.addClass('highlight');
			}
    }

});

$('.tab a').on('click', function (e) {
  
  e.preventDefault();
  
  $(this).parent().addClass('active');
  $(this).parent().siblings().removeClass('active');
  
  target = $(this).attr('href');

  $('.tab-content > div').not(target).hide();
  
  $(target).fadeIn(600);
  
});


$('#registerButton').click(function() {
  var thisData = {
    email : $('#registerEmail').val(),
    password : $('#registerPassword').val()
  }
  if (!thisData.email || !thisData.password){
    alert('Wypełnij wszystkie pola');
    return;
  }
  if (!isEmail(thisData.email)){
    alert('Podano zly email');
    return;
  }
  $.ajax
    ({
        type: "POST",
        //the url where you want to sent the userName and password to
        url: '/register',
        dataType: 'json',
        async: true,
        data: thisData,
        success: function () {
        alert("Zarejestrowano! Zaloguj się!");
        },
        error:   function(jqXHR, textStatus, errorThrown) {
        alert(jqXHR.responseText);

  }
    })
});

$('#loginButton').click(function() {
  var thisData = {
    email : $('#loginEmail').val(),
    password : $('#loginPassword').val()
  }
  if (!thisData.email || !thisData.password){
    alert('Wypełnij wszystkie pola');
    return;
  }
  if (!isEmail(thisData.email)){
    alert('Podano zly email');
    return;
  }
  $.ajax
    ({
        type: "POST",
        //the url where you want to sent the userName and password to
        url: '/login',
        dataType: 'json',
        async: true,
        data: thisData,
        success: function () {
          window.location.replace('/');
        },
        error:   function(jqXHR, textStatus, errorThrown) {
        alert(jqXHR.responseText);

  }
    })
});



function isEmail(email) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}