export function createSamplePhoto(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 900;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建示例图片");
  }

  const gradient = context.createLinearGradient(0, 0, 1280, 900);
  gradient.addColorStop(0, "#d4dce6");
  gradient.addColorStop(1, "#b5c0ce");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.translate(640, 452);
  context.rotate((-4.2 * Math.PI) / 180);
  context.fillStyle = "rgba(31, 43, 57, 0.18)";
  context.fillRect(-380, -500, 760, 1000);
  context.fillStyle = "#fbfaf4";
  context.fillRect(-394, -514, 760, 1000);

  context.fillStyle = "#202833";
  context.font = "700 36px Arial, sans-serif";
  context.fillText("Application Form", -318, -410);
  context.font = "500 22px Arial, sans-serif";
  context.fillStyle = "#596474";
  context.fillText("No. AF-0626", 165, -410);

  context.strokeStyle = "#cfd4d8";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-318, -360);
  context.lineTo(300, -360);
  context.stroke();

  const rows = [
    ["Applicant Name", "Alex Chen"],
    ["Document Type", "Study Plan"],
    ["Submission ID", "A2026-0616"],
    ["Review Status", "Prepared"],
    ["Contact", "Masked"],
  ];

  context.font = "24px Arial, sans-serif";
  rows.forEach((row, index) => {
    const y = -286 + index * 74;
    context.fillStyle = "#222b35";
    context.fillText(row[0], -318, y);
    context.fillText(row[1], 188, y);
    context.strokeStyle = "rgba(199, 206, 214, 0.66)";
    context.beginPath();
    context.moveTo(-318, y + 28);
    context.lineTo(300, y + 28);
    context.stroke();
  });

  context.font = "700 28px Arial, sans-serif";
  context.fillStyle = "#151d26";
  context.fillText("Signature", -318, 164);
  context.fillText("Verified", 188, 164);

  context.font = "18px Arial, sans-serif";
  context.fillStyle = "#646e79";
  for (let i = 0; i < 8; i += 1) {
    context.fillRect(-318, 240 + i * 26, 520 - i * 18, 7);
  }

  context.restore();

  const noise = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < noise.data.length; i += 4) {
    const seed = Math.sin(i * 0.013) * 43758.5453;
    const value = (seed - Math.floor(seed) - 0.5) * 10;
    noise.data[i] += value;
    noise.data[i + 1] += value;
    noise.data[i + 2] += value;
  }
  context.putImageData(noise, 0, 0);

  return canvas.toDataURL("image/png");
}
