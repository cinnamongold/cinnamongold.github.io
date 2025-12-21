function getAverageColor(imgE1) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = canvas.width = imgE1.naturalWidth || imgE1.width;
    const height = canvas.height = imgE1.naturalHeight || imgE1.height;

    ctx.drawImage(imgE1, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let r = 0, g=0, b=0, count=0;

    for (let i=0;i<data.length;i+=4*10) {
        r+=data[i];
        g+=data[i+1];
        b+=data[i+2];
        count++;
    }

    r = Math.round(r/count);
    g = Math.round(g/count);
    b = Math.round(b/count);

    return {r,g,b};
}

const albumImg = document.getElementById("album-cover");
const bgDiv = document.getElementById("now-playing-card");
const outerColor = 'rgba(255, 255, 255, 0.25)';

albumImg.onload = function() {
    const {r,g,b} = getAverageColor(albumImg);
    const centerColor = `rgb(${r},${g},${b})`;

    bgDiv.style.backgroundImage = `radial-gradient(circle at 50% 60%,
    ${centerColor} 0%,
    ${centerColor} 35%,
    ${outerColor} 90%)`;
}