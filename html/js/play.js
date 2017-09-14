$(document).on ("click", ".cell", function () {
  resetAllSelectedCells();
  var selectedClass = $(this).attr("class").split(' ')[1];
  console.log(selectedClass);
  $('.' + selectedClass).attr("bgcolor", "#99bbff");
  $.get('/hint/' + selectedClass, function(data, status){
    $("#sidebar-wrapper").empty();
    $("#sidebar-wrapper").append(data);
  });
  setEditPointer(selectedClass);
});


function resetAllSelectedCells(){
  $('[bgcolor=#99bbff]').attr('bgcolor', '#ffffff');
}

function setEditPointer(selectedClass){
	var selectedArray = $('.' + selectedClass).attr("bgcolor", "#99bbff").toArray();
	var cursor = 0;
	var end = selectedArray.length - 1;
  if ($(selectedArray[end]).html().replace('&nbsp;', '').length > 0){
    end--;
  }
  function setCursorAt(selectedArray, cursor){
    for (var j = cursor; j < end; j++){
      if ($(selectedArray[cursor]).html() == '&nbsp;')
      break;
      cursor++;
    }
    $(selectedArray[cursor]).prop('contenteditable', true);
    $(selectedArray[cursor]).trigger('make_editable');
    $(selectedArray[cursor]).trigger('focus');
    $(selectedArray[cursor]).on('input', function(input) {
      var currentTdValue = $(selectedArray[cursor]).html().replace('&nbsp;', '');
      $(selectedArray[cursor]).html(currentTdValue);
      console.log(currentTdValue);
      if (cursor < end){
        $(selectedArray[cursor]).prop('contenteditable', false);
        cursor++;
        setCursorAt(selectedArray, cursor);
      } else {
        $(':focus').blur();
        var word = '';
        var wordId;
        var check = true;
        for (var m = 0; m < selectedArray.length; m++){
          word += $(selectedArray[m]).html();
        }
        console.log('word ' + word + ', ' + 'wordId ' + selectedClass);
        $.post( "/verifyword", { 'wordid' : selectedClass, 'word' : word }, function( data ) {
          if (data == 'ok'){
            $('.' + selectedClass).attr("bgcolor", "#99ff99");
          } else {
            $('.' + selectedClass).attr("bgcolor", "#ff8080");
          }
        });
      }
    });
  }

  setCursorAt(selectedArray, cursor);

  for (var i = 0; i < selectedArray.length; i++){
    var col = $(selectedArray[i]).parent().children().index($(selectedArray[i]));
    var row = $(selectedArray[i]).parent().parent().children().index($(selectedArray[i]).parent());
  		//console.log('ROW: ' + row + ' COLUMN: ' + col);
   }
 }


 $(document).on ("click", "#generatelinkbutton", function () {
  var guestLinkToArray;
  var crossString = $('<div>').append($('#playablecrossword').clone()).html(); 
  
  $.post( "/savecrossword", { 'table' : crossString}, function(data) {
    console.log(data);
  });
  $('#linkinput').val('elo');
});