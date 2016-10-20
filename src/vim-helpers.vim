let neovimbed = {}
function neovimbed.NotifyIfNewEmptyBuffer(messageName)
    if expand("<afile>") == ""
        " No filename for current buffer
        call rpcnotify(0, a:messageName, [neovimbed.getCurrentWindowId(), bufnr(""), bufname(bufnr(""))], '')
    endif
endfunction

" Assign a window an ID that will stay the same regardless of it's position
" This is used instead of 
let s:nextId = 0
function neovimbed.getCurrentWindowId()
    if !exists("w:nvim_window_name")
        let w:nvim_window_name='win-'.s:nextId
        let s:nextId += 1
    endif
    return w:nvim_window_name
endfunction

let s:current_buffer_window_id=neovimbed.getCurrentWindowId()

autocmd BufEnter *
    \ let s:previous_buffer_window_id=s:current_buffer_window_id |
    \ let s:current_buffer_window_id=neovimbed.getCurrentWindowId()

function neovimbed.getCurrentBufferWindowId()
    return s:current_buffer_window_id
endfunction

" Primarily used to track window a buffer was removed from. Order of events
" from vim appears to be BufEnter before BufDelete so we need to track the
" previous buffers window (ie. calling getCurrentWindowId() in BufDelete will
" actually return the buffer entered after the delete.
function neovimbed.getPreviousBufferWindowId()
    return s:previous_buffer_window_id
endfunction
