/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./landing/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                customGray: '#272727', // Add your custom color
                flixred: '#E50914',
                mint: '#A1D6B2',
              },
              
        },
    },
    
    plugins: [],
}

