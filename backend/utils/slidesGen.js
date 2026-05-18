// =============================================================================
// Presentation/Slides Generation using pptxgenjs
// =============================================================================

const PptxGenJS = require('pptxgenjs');

/**
 * Generate a PowerPoint presentation
 * Uses Ollama to generate slide content if available
 */
async function generateSlides(topic) {
  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = topic;
    pptx.author = 'ByrdHouse';

    // Color scheme
    const primaryColor = '5B2D8E'; // Purple
    const accentColor = 'E91E8C'; // Pink
    const darkBg = '0D0D0D';
    const lightText = 'FFFFFF';

    // Slide 1: Title
    const slide1 = pptx.addSlide();
    slide1.background = { color: darkBg };
    
    // Gradient-like effect with overlapping shapes
    slide1.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 5.625,
      fill: { color: primaryColor, transparency: 30 }
    });
    slide1.addShape(pptx.ShapeType.rect, {
      x: 6, y: 3, w: 4, h: 2.625,
      fill: { color: accentColor, transparency: 40 }
    });

    slide1.addText(topic, {
      x: 0.5, y: 1.5, w: 9, h: 1.5,
      fontSize: 44, bold: true, color: lightText,
      fontFace: 'Arial', align: 'center'
    });

    slide1.addText('Created with ByrdHouse AI', {
      x: 0.5, y: 3.2, w: 9, h: 0.6,
      fontSize: 18, color: 'CCCCCC', align: 'center'
    });

    slide1.addText(new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    }), {
      x: 0.5, y: 4.2, w: 9, h: 0.5,
      fontSize: 12, color: '888888', align: 'center'
    });

    // Slide 2: Overview
    const slide2 = pptx.addSlide();
    slide2.background = { color: darkBg };
    slide2.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.2, h: 5.625,
      fill: { color: primaryColor }
    });

    slide2.addText('Overview', {
      x: 0.5, y: 0.4, w: 9, h: 0.8,
      fontSize: 32, bold: true, color: lightText, fontFace: 'Arial'
    });

    slide2.addText([
      { text: 'What is it?\n', options: { bold: true, color: accentColor, fontSize: 16 } },
      { text: `${topic} is an important concept with many applications.\n\n`, options: { color: 'CCCCCC', fontSize: 14 } },
      { text: `Why does it matter?\n`, options: { bold: true, color: accentColor, fontSize: 16 } },
      { text: `Understanding ${topic} can help you make better decisions and achieve your goals.`, options: { color: 'CCCCCC', fontSize: 14 } }
    ], {
      x: 0.7, y: 1.5, w: 8.5, h: 3.5,
      valign: 'top'
    });

    // Slide 3: Key Points
    const slide3 = pptx.addSlide();
    slide3.background = { color: darkBg };
    slide3.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.2, h: 5.625,
      fill: { color: primaryColor }
    });

    slide3.addText('Key Points', {
      x: 0.5, y: 0.4, w: 9, h: 0.8,
      fontSize: 32, bold: true, color: lightText, fontFace: 'Arial'
    });

    const keyPoints = [
      'Foundation: Core concepts and principles',
      'Application: Real-world use cases',
      'Benefits: What you gain from understanding',
      'Next Steps: How to get started'
    ];

    keyPoints.forEach((point, i) => {
      slide3.addShape(pptx.ShapeType.roundRect, {
        x: 0.7, y: 1.3 + i * 0.9, w: 8.5, h: 0.7,
        fill: { color: '1E1E1E' },
        line: { color: primaryColor, width: 1 }
      });
      
      slide3.addText(`${i + 1}.  ${point}`, {
        x: 0.9, y: 1.4 + i * 0.9, w: 8, h: 0.5,
        fontSize: 14, color: lightText, fontFace: 'Arial', valign: 'middle'
      });
    });

    // Slide 4: Conclusion
    const slide4 = pptx.addSlide();
    slide4.background = { color: primaryColor };
    
    slide4.addText('Conclusion', {
      x: 0.5, y: 1.5, w: 9, h: 0.8,
      fontSize: 36, bold: true, color: lightText, align: 'center'
    });

    slide4.addText(`"${topic}" — Start creating today with ByrdHouse.`, {
      x: 0.5, y: 2.5, w: 9, h: 1,
      fontSize: 20, color: 'DDDDDD', align: 'center', italic: true
    });

    slide4.addText('byrdhouse.ai', {
      x: 0.5, y: 4.5, w: 9, h: 0.5,
      fontSize: 14, color: 'CCCCCC', align: 'center'
    });

    // Generate as base64
    const pptxBase64 = await pptx.writeBase64({ mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

    return {
      pptxUrl: `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${pptxBase64}`,
      status: 'success',
      topic,
      slideCount: 4
    };

  } catch (error) {
    console.error('[SLIDES ERROR]', error.message);
    throw new Error(`Slides generation failed: ${error.message}`);
  }
}

module.exports = { generateSlides };