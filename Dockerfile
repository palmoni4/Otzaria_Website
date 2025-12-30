FROM node:20-alpine

# התקנת תלויות מערכת לעיבוד תמונות ו-PDF
RUN apk add --no-cache \
    graphicsmagick \
    ghostscript \
    libc6-compat

WORKDIR /app

# התקנת תלויות פרויקט
COPY package*.json ./
RUN npm ci

# העתקת קוד המקור
COPY . .

# בניית הפרויקט
RUN npm run build

# חשיפת הפורט
EXPOSE 3000

# הרצת השרת
CMD ["npm", "start"]