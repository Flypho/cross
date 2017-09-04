$('#addwordbutton').click(function(event) {
  event.preventDefault();
  var wordValue = $('#word').val();
  var hintValue = $('#hint').val();
  if (wordValue.length < 2 || wordValue.length > 25 || hintValue.length < 3 || hintValue.length > 50){
    alert('Pole z hasłem musi mieć od 2 do 25 znaków, a pole z podpowiedzią 3-50');
    return;
  }
  var form = $("#waterform")[0];
  var formData = new FormData(form);
  if ($("#picture").val() == ''){
    formData.delete('picture');
  }
  if ($("#audio").val() == ''){
    formData.delete('audio');
  }
  var address = window.location.href;
  $.ajax({
    url: address,
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function(result){
      $('#audio').val(null);
      $('#picture').val(null);
      $('#hint').val(null);
      $('#word').val(null); 
      $('#wordslist').replaceWith(result);

    },
    error: function(error){
      alert(JSON.stringify(error)); 
    }
  });
});

$(document).on ("click", ".deletewordbutton", function () {
  console.log('Delete word button on!');
  var address = window.location.href;
  $.ajax({
    url: address,
    method: "DELETE",
    data: {'wordId' : this.id},
    success: function(result){
      $('#wordslist').replaceWith(result);
    },
    error: function(error){
      alert(JSON.stringify(error)); 
    }
  });
});
