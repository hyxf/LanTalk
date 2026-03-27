import { useUserList } from '../hooks'
import { useContactsStore } from '../store'

export const UserList = () => {
  const users = useUserList()
  const myId = useContactsStore(state => state.myId)
  const peers = users.filter(u => u.id !== myId)

  return (
    <>
      <div className="section-title">Online Devices</div>
      <div className="user-list">
        {peers.map(user => (
          <div key={user.id} className={`user-item ${user.isActive ? 'active' : ''}`}>
            <div className="avatar-box">
              <div className="avatar-img">{user.initials}</div>
              {user.status === 'online' && <div className="status-dot"></div>}
            </div>
            <div className="u-info">
              <h4>{user.name}</h4>
              <p>{user.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
