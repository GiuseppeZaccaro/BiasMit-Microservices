# ---- Stage 1: Build ----
#scarico immagine node e le assegno il nome builder
FROM node:20-alpine AS builder 

WORKDIR /app
#copio i file che descrivono le dipendenze e poi li scarico usando il caching
COPY package*.json ./
RUN npm install
#copia il resto del codice sorgente
COPY . .

# L'URL del gateway viene iniettato a build-time come ARG (accessibile da Vite tramite VITE_)
#dichiaro un argomento di build ,cioè una variabile che esiste solo mentre creo l'immagine e che dice a React dove cercare Springboot
ARG VITE_API_BASE_URL=http://localhost:8080/api/gateway
#Trasforma l'argomento in una variabile d'ambiente
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
#compilazione
RUN npm run build

# ---- Stage 2: Serve ----
#server web rapido 
FROM nginx:alpine
#prende il risultato del primo stage e cancella il resto
COPY --from=builder /app/dist /usr/share/nginx/html
#sostisuisce la configurazione base di nginx con la mia
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
#avvio il server nginx
#daemon off obbliga il container docker a rimanere acceso
CMD ["nginx", "-g", "daemon off;"]
