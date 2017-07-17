const { curry, pipe, defaultTo, prop, equals, forEach, map, split, filter, ap } = R

const CODE_PAGE_437 = `
  ☺ ☻ ♥ ♦ ♣ ♠ •	◘	○	◙	♂	♀	♪	♫	☼ 	►	◄	↕	‼	¶	§	▬	↨	↑	↓	→	←	∟	↔	▲	▼ !
  "	#	$	%	&	\' ( )	*	+	,	-	.	/	:	;	<	=	>	? 	@		]	^	 \`	{	|	} A B
  C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i
  j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 ~	⌂ Ç ü é	â
  ä	à	å	ç	ê	ë	è	ï	î	ì	Ä	Å É	æ	Æ	ô	ö	ò	û	ù	ÿ	Ö	Ü	¢	£	¥	₧	ƒ á	í	ó	ú
  ñ	Ñ	ª	º	¿	⌐	¬	½	¼	¡	«	» ░	▒	▓	│	┤	╡	╢	╖	╕	╣	║	╗	╝	╜	╛	┐ └	┴	┬	├
  ─	┼	╞	╟	╚	╔	╩	╦	╠	═	╬	╧ ╨	╤	╥	╙	╘	╒	╓	╫	╪	┘	┌	█	▄	▌	▐	▀ α	ß Γ π
  Σ	σ	µ	τ	Φ	Θ	Ω	δ	∞	φ	ε	∩   ≡	±	≥	≤	⌠	⌡	÷	≈
  ° ∙	·	√	ⁿ	²	■	]
`
const MAX_UPDATE_INTERVAL = 200
const MIN_UPDATE_INTERVAL = 50
const MAX_UPDATES = 20

const page437Characters = CODE_PAGE_437.trim().replace(/ |\t+|\n/g, '').split('')

// find fast and pure alternative
const getPage437Character = () => page437Characters[Math.round(Math.random() * 251)]

const doWithChance = (callback, chance = 1) => (Math.abs(Math.random() - 1) <= chance) && callback()

const createTextNode = text => document.createTextNode(text)
const createElement = name => document.createElement(name)
const replaceNode = curry(
  (oldNode, newNode) => {
    oldNode.parentElement.replaceChild(newNode, oldNode)

    return newNode
  }
)
const append = curry((parent, node) => parent.appendChild(node))
const appendMany = curry((nodes, parent) => {
  nodes.forEach(append(parent))
  return nodes
})

const isTextNode = pipe(
  defaultTo({}),
  prop('nodeName'),
  equals('#text')
)

const filterNodes = curry(
  (filter, container) => {
    let currentNode
    const nodes = []
    const walker = document.createTreeWalker(container, filter)

    while (currentNode = walker.nextNode()) nodes.push(currentNode)

    return nodes
  }
)

const filterTextNodes = filterNodes(NodeFilter.SHOW_TEXT)

const isNewLine = text => text.replace(/ /g, '') === '\n'
const notBlankNode = pipe(
  prop('nodeValue'),
  text => !isNewLine(text)
)

const splitTextNode = pipe(
  prop('nodeValue'),
  split(''),
  map(createTextNode),
)

const splitAndReplaceNode = node => pipe(
  () => createElement('span'),
  replaceNode(node),
  appendMany(splitTextNode(node)),
)(node)

const encrypt = node => {
  // replacing whole node was too slow
  node.nodeValue = getPage437Character()
  return node
}

const decrypt = curry(
  (config, { orginialValue, encrypted }) => {
   let interval
   let updates = 0
   let currentNode = encrypted

   const intervalTime = (Math.random() * config.maxUpdateInterval) + config.minUpdateInterval

   const update = () => {
     if (updates > config.maxUpdates) {
       currentNode.nodeValue = orginialValue
       clearInterval(interval)
     } else {
       currentNode = encrypt(currentNode)
       updates++
     }
   }

   interval = setInterval(
     update,
     intervalTime + doWithChance(() => config.extraDelay, .1)
   )

   return interval
 }
)

const noMoreSecretsNode = pipe(
  splitAndReplaceNode,
  filter(node => node.nodeValue !== ' ' && !isNewLine(node.nodeValue)),
  map(node => ({ orginialValue: node.nodeValue, encrypted: encrypt(node) }))
)

const noMoreSecrets = pipe(
  (container = document.body) => container,
  filterTextNodes,
  filter(notBlankNode),
  map(noMoreSecretsNode),
)

///////////////////////////////////////////////////////

// const encryptedNodes = noMoreSecrets(document.querySelector('h1'))
// const encryptedNodes = noMoreSecrets(document.querySelector('body > main > article > p:nth-child(3)'))
const encryptedNodes = noMoreSecrets(document.querySelector('body > main'))
const config = {
  maxUpdateInterval: MAX_UPDATE_INTERVAL,
  minUpdateInterval: MIN_UPDATE_INTERVAL,
  maxUpdates: MAX_UPDATES,
  extraDelay: 100
}

setTimeout(() => encryptedNodes.map(map(decrypt(config))), 1000)
