$(document).on ("click", ".cell", function () {
  resetAllSelectedCells();
  var selectedClass = $(this).attr("class").split(' ')[1];
  var wordArray = $('.' + selectedClass).toArray();
  if ($('.' + selectedClass).attr("bgcolor") == '#ff8080'){
    for (var i = 0; i < wordArray.length; i++){
      if ($(wordArray[i]).attr('bgcolor') != '#99ff99'){
        $(wordArray[i]).attr("bgcolor", '#ffffff');
        $(wordArray[i]).html('&nbsp;');
      }
    }
  } else if ($('.' + selectedClass).attr("bgcolor") == '#99ff99'){
    return;
  }
  for (var i = 0; i < wordArray.length; i++){
    if ($(wordArray[i]).attr('bgcolor') == '#ffffff' || !$(wordArray[i]).attr('bgcolor')){
      $(wordArray[i]).attr("bgcolor", "#99bbff");
    }
  }
  //$('.' + selectedClass).attr("bgcolor", "#99bbff");
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
	var selectedArray = $('.' + selectedClass).toArray();//attr("bgcolor", "#99bbff").toArray();
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
    var startingPosition = cursor;
    $(selectedArray[cursor]).prop('contenteditable', true);
    $(selectedArray[cursor]).trigger('make_editable');
    $(selectedArray[cursor]).trigger('focus');
    $(selectedArray[cursor]).on('keydown', function(e) {
      if( e.which == 8 || e.which == 46 ){
        ;
      }
    });
    $(selectedArray[cursor]).on('input', function(event) {
      var currentTdValue = $(selectedArray[cursor]).html().replace('&nbsp;', '');
      $(selectedArray[cursor]).html(currentTdValue);
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
        $.post( "/verifyword", { 'wordid' : selectedClass, 'word' : word }, function( data ) {
          if (data == 'ok'){
            $('.' + selectedClass).attr("bgcolor", "#99ff99");
          } else {
            for (var i = 0; i < selectedArray.length; i++){
              if ($(selectedArray[i]).attr('bgcolor') != '#99ff99'){
                $(selectedArray[i]).attr("bgcolor", "#ff8080");
              }
            }
            //$('.' + selectedClass).attr("bgcolor", "#ff8080");
          }
        });
      }
      $(selectedArray[cursor-1]).unbind();
    });
  }

  setCursorAt(selectedArray, cursor);
}


$(document).on ("click", "#generatelinkbutton", function () {
  var guestLinkToArray;
  var crossString = $('<div>').append($('#playablecrossword').clone()).html(); 
  
  $.post( "/savecrossword", { 'table' : crossString}, function(data) {
    $('#linkinput').val(data);
  });
});