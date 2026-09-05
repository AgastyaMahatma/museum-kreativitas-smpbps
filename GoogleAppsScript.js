/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (Code.gs) - STUDENT DIGITAL ART MUSEUM
 * =========================================================================
 * Headers: Artist | Artwork Image URL | Art Description | Date Created | Art Type | Num of Likes
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your Google Sheet (https://sheets.google.com).
 * 2. Click Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this code.
 * 4. Click Deploy > New deployment.
 * 5. Select type: "Web app"
 *    - Description: "Museum Art Sync API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Click Deploy, authorize permissions, and copy the Web App URL!
 * =========================================================================
 */

const HEADERS = [
  "Artist",
  "Artwork Image URL",
  "Art Description",
  "Date Created",
  "Art Type",
  "Num of Likes"
];

/**
 * Automatically sets up header row on open if empty and adds custom menu.
 */
function onOpen() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  setupSheetHeaders(sheet);
  
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎨 Museum Admin')
    .addItem('✨ Initialize Header Columns', 'manualSetupHeaders')
    .addItem('📊 Format Sheet Layout', 'formatSheetLayout')
    .addToUi();
}

function setupSheetHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    formatSheetLayout(sheet);
  }
}

function manualSetupHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  formatSheetLayout(sheet);
  SpreadsheetApp.getUi().alert('✅ Header row initialized successfully!');
}

function formatSheetLayout(sheet) {
  sheet = sheet || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1f2937');
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

/**
 * GET Request Handler - Fetches all artworks from the Google Sheet
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    setupSheetHeaders(sheet);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return responseJSON([]);
    }
    
    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);
    
    const result = rows.map((row, index) => {
      const record = { id: 'sheet_row_' + (index + 2) };
      headers.forEach((header, i) => {
        record[header] = row[i] !== undefined ? row[i] : '';
      });
      
      // Normalized aliases for backend API compatibility
      record.artist_name = record["Artist"] || record.artist_name || '';
      record.media_url = record["Artwork Image URL"] || record.media_url || '';
      record.description = record["Art Description"] || record.description || '';
      record.created_at = record["Date Created"] || record.created_at || '';
      record.art_type = record["Art Type"] || record.art_type || '';
      record.likes_count = parseInt(record["Num of Likes"]) || 0;
      
      return record;
    });
    
    return responseJSON(result);
  } catch (error) {
    return responseJSON({ error: error.toString() });
  }
}

/**
 * POST Request Handler - Appends a new artwork row to the Google Sheet
 */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    setupSheetHeaders(sheet);
    
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    
    const artist = payload.Artist || payload.artist || payload.artist_name || 'Anonymous Artist';
    const mediaUrl = payload["Artwork Image URL"] || payload.media_url || payload.mediaUrl || '';
    const description = payload["Art Description"] || payload.description || payload.art_description || '';
    const dateCreated = payload["Date Created"] || payload.created_at || payload.upload_date || new Date().toISOString();
    const artType = payload["Art Type"] || payload.art_type || payload.artType || 'Digital Art';
    const numOfLikes = parseInt(payload["Num of Likes"] || payload.likes_count || payload.likes) || 0;
    
    const newRow = [
      artist,
      mediaUrl,
      description,
      dateCreated,
      artType,
      numOfLikes
    ];
    
    sheet.appendRow(newRow);
    
    return responseJSON({
      status: 'success',
      message: 'Artwork saved successfully to Google Sheets!',
      data: {
        Artist: artist,
        "Artwork Image URL": mediaUrl,
        "Art Description": description,
        "Date Created": dateCreated,
        "Art Type": artType,
        "Num of Likes": numOfLikes
      }
    });
  } catch (error) {
    return responseJSON({ status: 'error', error: error.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
