var cardWidth = 250;
var cardHeight = 350;
var typeHash = {
	A : "animate",
	S : "structure",
	T : "tool"
};

var arrayToObject = function(separator, card) {
	var array = card.split(separator || "|");
	return {
		type : typeHash[array[0]],
		subType : array[1],
		name : array[2],
		effect : array[3],
		wit: array[4],
		power: array[5],
		resist: array[6],
		cost: array[7]
	};
};

var objectToEl = function(card, template) {
	return template.outerHTML
	.replace("{cost}", card.cost)
	.replace("{subType}", card.subType ? "(" + card.subType + ")" : "")
	.replace("{name}", card.name)
	.replace("{effect}", card.effect)
	.replace("{wit}", card.wit)
	.replace("{power}", card.power)
	.replace("{resist}", card.resist)
	;
};
window.templater = {
	render : function(csv, maxWidth, border, separator, breakHeight) {
		var cards, templates, cardSheet, breaker,
			x, y;
		templates = {
			"animate" : document.querySelector("#animateTemplate > g"),
			"structure" : document.querySelector("#structureTemplate > g"),
			"tool": document.querySelector("#toolTemplate > g")
		};

		cards = csv.split(/\r\n|\n/);
		cards = cards.map(arrayToObject.bind({}, separator));
		cards = cards.map(function(card) {
			 return objectToEl(card, templates[card.type]);
		});
		
		y = x = 0;
		
		cardSheet = document.getElementById("cardSheet");
		cardSheet.innerHTML = "";
		
		var count = 1;
		cards.forEach(function(card) {
			card = card
			.replace("{offsetX}", x)
			.replace("{offsetY}", y);
			
			cardSheet.innerHTML += card;
			
			if (count >= 9) {
				x = 0;
				y += breakHeight + border + cardHeight;
				count = 1;
				return;
			}
			count++;
			if (x + ((cardWidth + border) * 2) <= maxWidth) {
				x += (border + cardWidth);
			} else {
				x = 0;
				y += (border + cardHeight);
			}				
		});
	}
};