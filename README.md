# 7 formas de dizer Eu te amo no estilo Marvel

Segunda versão do álbum, criada em pasta separada para preservar o MVP original.

## Como abrir

Abra `index.html` no navegador, ou sirva esta pasta em um servidor local simples.

## Como personalizar

Edite `album.config.js`:

- `cover`: nomes, data, título e imagem da capa.
- `audio.youtubeId`: ID de um vídeo do YouTube para tentar tocar via embed após o clique inicial.
- `audio.src`: caminho de uma música local. O projeto já aponta para `assets/audio/marvel-theme.mp3`.
- `audio.dataUri`: áudio completo em formato `data:audio/mpeg;base64,...`, caso queira embutir direto.
- `audio.base64` + `audio.mimeType`: alternativa para colar só o conteúdo base64, sem o prefixo `data:`.
- `audio.youtubeFallbackGenerated`: deixe `false` para não tocar trilha gerada se o YouTube falhar.
- `pages`: cada par de páginas representa uma das 7 formas.
- páginas `art`: personagem/referência + frase.
- páginas `photo`: foto pessoal correspondente.
- página `photoFinal`: foto pessoal com encerramento e botão para rever.

O efeito de virada usa o StPageFlip local em `vendor/page-flip.browser.js`, sem CDN.

Os personagens usados no álbum estão em `assets/heroes/originals/`, apontados diretamente pelo `album.config.js`.

## Fotos pessoais

Coloque as fotos em `assets/photos/` com estes nomes:

- `foto1.jpg`: foto da página do Homem de Ferro.
- `foto2.jpg`: foto da página do Doutor Estranho.
- `foto3.jpg`: foto da página do Capitão América.
- `foto4.jpg`: foto da página do Homem-Aranha.
- `foto5.jpg`: foto da página do Thor.
- `foto6.jpg`: foto da página do Loki.
- `foto7.jpg`: foto final da Wanda/encerramento.

Enquanto alguma foto não existir, o álbum mostra automaticamente o placeholder.

As fotos aparecem inteiras por padrão, sem corte. Para uma foto específica preencher a moldura cortando as bordas, adicione no item dela em `album.config.js`:

```js
fit: "cover",
position: "center center"
```

Você pode trocar `position` por valores como `"top center"`, `"bottom center"` ou `"35% 50%"` para ajustar o enquadramento.

Para uso comercial, valide direitos autorais de personagens e trilha sonora antes de publicar.
